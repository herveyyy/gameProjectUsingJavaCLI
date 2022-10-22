package Main;

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/**
 *
 * @author Z1nk
 */
public class gameTempBattleStats {
    
    public String tempEnemyName;
    private String tempEnemySkillName;
    private float tempEnemyHealth;
    private float tempEnemyStamina;
    private double tempEnemyDamage;
    private double tempEnemyMana = 0;//temp
    public String tempPlayerName;
    private String tempPlayerSkillName;
    private float tempPlayerHealth;
    private float tempPlayerStamina;
    private double tempPlayerDamage;
    private double tempPlayerMana = 0;//temp
    
    
    
    
    
    public void setEnemyTempName(String name){
    this.tempEnemyName = name;
    
    }
    public String enemyTempName(){

        return tempEnemyName;

    }
    public void setEnemySkillName(String skillname){
    this.tempEnemySkillName = skillname;
    
    }
    public String enemySkillName(){

        return tempEnemySkillName;

    }
    public void setEnemyTempHealth(float hp){
    this.tempEnemyHealth = hp;
    
    }
    public float enemyTempHealth(float damage){
this.tempEnemyHealth = tempEnemyHealth - damage;
        return tempEnemyHealth;

    }
    public void setEnemyTempStamina(float sta){
    this.tempEnemyStamina = sta;
    
    }
    
    public float enemyTempStamina(){

        return tempEnemyStamina;

    }
    public void setEnemyTempDamage(double d){
    this.tempEnemyDamage = d;
    
    }
    public double enemyTempDamage(){

        return tempEnemyDamage;

    }
    public void setEnemyTempMana(double mana){
    this.tempEnemyMana = mana;
    
    }
    public double enemyTempMana(){

        return tempEnemyMana;

    }
    public void setPlayerTempName(String name){
    this.tempPlayerName = name;
    
    }
    public String playerTempName(){

        return tempPlayerName;

    }
    public void setPlayerSkillName(String skillname){
    this.tempPlayerSkillName = skillname;
    
    }
    public String playerSkillName(){

        return tempPlayerSkillName;

    }
    public void setPlayerTempHealth(float hp){
    this.tempPlayerHealth = hp;
    
    }
    public float playerTempHealth(float damage){
tempPlayerHealth = tempPlayerHealth - damage;
        return tempPlayerHealth;

    }
    public void setPlayerTempStamina(float sta){
    this.tempPlayerStamina = sta;
    
    }
    
    public float playerTempStamina(){

        return tempPlayerStamina;

    }
    public void setPlayerTempDamage(double d){
    this.tempPlayerDamage = d;
    
    }
    public double playerTempDamage(){

        return tempPlayerDamage;

    }
    public void setPlayerTempMana(double mana){
    this.tempPlayerMana = mana;
    
    }
    public double playerTempMana(){

        return tempPlayerMana;

    }

   


    
}
