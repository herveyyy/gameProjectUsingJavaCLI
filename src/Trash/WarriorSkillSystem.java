package Trash;


import Main.Player;
public class WarriorSkillSystem {
    private int n = 4;
   public String skillName;
   public float effect;
   protected float skillDamage;
   public  float minusMana = 1.5f;
   public String[] skills = new String[4];
   
  public float skillHorizontalSlash(){
         this.skillName = "Horizontal Slash";
  
    this.minusMana = (int) (skillDamage * minusMana);
   this.skillDamage = 7f; 
        return skillDamage;
    }

    public float skillVerticalSlash(){
          this.skillName = "Vertical Slash";
    this.skillDamage = 8f;
    this.minusMana = (int) (skillDamage * minusMana);
        return skillDamage;
    
    }
   
    public float skillShieldBash(){
    this.skillName = "Evasion";
    this.skillDamage = 1f;
    this.effect = 0f;//enemy cant attack next round
    this.minusMana = (int) (skillDamage * minusMana);
    return 3f;
    
    }
    public void chooseSkill(int choice){
   
    
    if(skills[choice] == skills[1]){  
    skillHorizontalSlash();
    System.out.println("You used: "+skillName+"\n"+"Damage: "+ skillDamage );
    }else if(skills[choice] == skills[2]){  
    skillVerticalSlash();
    System.out.println("You used: "+skillName+"\n"+"Damage: "+ skillDamage );
    }else if(skills[choice] == skills[3]){  
    skillShieldBash();
    System.out.println("You used: "+skillName+"\n"+"Damage: "+ skillDamage );
    
    }
    }
    public void currentSkills(){
     skillHorizontalSlash();
       this.skills[1] = skillName;
     skillVerticalSlash();
       this.skills[2] = skillName;
     skillShieldBash();
       this.skills[3] = skillName;
       
    }
    public void displaySkills(){
    for(int i = 1; i < n; i++){
               System.out.println( i + ". "+ skills[i]);
               }
    }
}

